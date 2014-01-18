import java.io.*;
import javax.servlet.*;
import javax.servlet.http.*;

import java.io.*;
import org.apache.batik.transcoder.TranscoderInput;
import org.apache.batik.transcoder.TranscoderOutput;
import org.apache.batik.transcoder.Transcoder;
import org.apache.batik.transcoder.TranscoderException;

import java.nio.charset.Charset;

import org.apache.fop.svg.PDFTranscoder;
import org.apache.batik.transcoder.image.PNGTranscoder;

import java.text.SimpleDateFormat;
import java.io.StringReader;
import org.xml.sax.InputSource;
import org.w3c.dom.Document;
import java.io.ByteArrayInputStream;
import java.awt.Color;


/**
 * :~/Dropbox/_work/d3/dev/batik/batik-1.7$ javac  -target 1.6 -source 1.6 -cp batik.jar:servlet-api-2.5.jar TranscoderServlet.java 
 * cp TranscoderServlet.class /var/lib/jetty/webapps/transcode/WEB-INF/classes/

 * restart JETTY: sudo /etc/init.d/jetty restart
 * and watch log: tail -f 2013_12_29.stderrout.log 
 * package war file: /var/lib/jetty/webapps/transcode$ jar cvf /home/cactus/Dropbox/_work/d3/dev/java/transcode.war .

 * /var/log/tomcat6/catalina.out => on www.kathan.at

*/
public class TranscoderServlet extends HttpServlet
{
    protected void doGet(HttpServletRequest req, HttpServletResponse resp)
        throws ServletException, IOException
    {
        String data = req.getParameter("data");
        String format = req.getParameter("output_format");
        PrintWriter out = resp.getWriter();

		System.out.println("in servlet.doGet(): got data");
        
        out.println("<html>");
        out.println("<body>");
        out.println("transcoder servlet: GET not supported !format= "+format+" data="+data);
        out.println("</body>");
        out.println("</html>");
    }

    protected void doPost(HttpServletRequest req, HttpServletResponse resp)
        throws ServletException, IOException
    {
        
        /* inspired by http://d3export.cancan.cshl.edu/ */
        /* python SVG converter http://cairosvg.org/user_documentation/ */
        String data = req.getParameter("data");
        String format = req.getParameter("format");
        String context = req.getParameter("context");
        
        int svg_width = Integer.parseInt(req.getParameter("svg_width"));
        int svg_height = Integer.parseInt(req.getParameter("svg_height"));
        int png_scale = Integer.parseInt(req.getParameter("png_scale"));
        
        
        
        SimpleDateFormat dformat = new SimpleDateFormat("yyyy-MM-dd HH_mm_ss");
		String dateString = dformat.format( System.currentTimeMillis()  );

		String fileName="kanban_transcoded_"+context+" "+dateString;

        
        System.out.println("in servlet.doPost(): got data - format: "+format+" context: "+context+" svg_width: "+svg_width+" svg_height: "+svg_height+" png_scale: "+png_scale);
        
        ServletOutputStream servletOutputStream = resp.getOutputStream();

		if (format.equals("pdf")){

			fileName+=".pdf";

			resp.setContentType("application/pdf");
			resp.setHeader("Content-Disposition","attachment; filename=\"" + fileName + "\"");
			resp.setHeader("Cache-Control", "no-cache");

			try{	
			
			
			//Step -1: We read the input SVG document into Transcoder Input
			TranscoderInput input_svg_image = new TranscoderInput(new StringReader(data));        
			
			System.out.println(":-) and handed it off to a transcoderinput");
			
			//Step-2: Define OutputStream to PDF file and attach to TranscoderOutput
			TranscoderOutput output = new TranscoderOutput(servletOutputStream);               

			System.out.println(":-) and created a transcoder output from servlet outputstream ");
			
			// Step-3: Create a PDF Transcoder and define hints
			Transcoder transcoder = new PDFTranscoder();
			
			//transcoder.addTranscodingHint(PDFTranscoder.KEY_DEVICE_RESOLUTION, new Float(600));
			
			System.out.println(":-) instantiated PDFTranscoder ");


			// Step-4: Write output to PDF format
			transcoder.transcode(input_svg_image, output);
			System.out.println(":o) and did successful transcoding ");

			// Step 5- close / flush Output Stream
			
			}
			catch (Exception te){
				te.printStackTrace(System.out);
			}
        
		}
		else if (format.equals("png")){
			fileName+=".png";

			resp.setContentType("image/png");
			resp.setHeader("Content-Disposition","attachment; filename=\"" + fileName + "\"");
			resp.setHeader("Cache-Control", "no-cache");

			try{	
			
			//Step -1: We read the input SVG document into Transcoder Input
			TranscoderInput input_svg_image = new TranscoderInput(new StringReader(data));        
			
			System.out.println(":-) and handed it off to a transcoderinput");
			
			//Step-2: Define OutputStream to PNG file and attach to TranscoderOutput
			TranscoderOutput output = new TranscoderOutput(servletOutputStream);               

			System.out.println(":-) and created a transcoder output from servlet outputstream ");
			
			// Step-3: Create a PNG Transcoder and define hints
			Transcoder transcoder = new PNGTranscoder();
			//transcoder.addTranscodingHint(PNGTranscoder.KEY_FORCE_TRANSPARENT_WHITE,Boolean.TRUE);
			transcoder.addTranscodingHint(PNGTranscoder.KEY_BACKGROUND_COLOR, Color.white);
			transcoder.addTranscodingHint(PNGTranscoder.KEY_WIDTH, new Float(svg_width*png_scale));
			transcoder.addTranscodingHint(PNGTranscoder.KEY_HEIGHT, new Float(svg_height*png_scale));
			
			
			System.out.println(":-) instantiated PNGTranscoder ");


			// Step-4: Write output to PNG format
			transcoder.transcode(input_svg_image, output);
			System.out.println(":o) and did successful transcoding to PNG");

			// Step 5- close / flush Output Stream
			
			}
			catch (Exception te){
				te.printStackTrace(System.out);
			}
		}
        else if (format.equals("svg")){
			
			fileName+=".svg";

			resp.setContentType("image/svg+xml");
			resp.setHeader("Content-Disposition","attachment; filename=\"" + fileName + "\"");
			resp.setHeader("Cache-Control", "no-cache");

			try{	
			
			//stream data into servletOutputStream
			servletOutputStream.write(data.getBytes(Charset.forName("UTF-8")));
			
			}
			catch (Exception te){
				te.printStackTrace(System.out);
			}
        
		}
		
		servletOutputStream.flush();
        servletOutputStream.close();        

        System.out.println("[ok]");
        
        
		
    }
}
